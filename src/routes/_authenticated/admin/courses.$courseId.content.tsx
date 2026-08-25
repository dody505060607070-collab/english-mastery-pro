import { createFileRoute, useParams } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  GripVertical, 
  Plus, 
  Trash2, 
  Save, 
  Layout,
  PlayCircle,
  FileText,
  BookOpen,
  Headphones,
  Eye,
  Type,
  Activity,
  ClipboardCheck
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useServerFn } from "@tanstack/react-start";
import { updateCourseStructure } from "@/utils/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/courses/$courseId/content")({
  component: CourseContentManager,
});

const LESSON_TYPES = [
  { value: 'Grammar', label: 'Grammar', icon: BookOpen },
  { value: 'Listening', label: 'Listening', icon: Headphones },
  { value: 'Reading', label: 'Reading', icon: Eye },
  { value: 'Vocabulary', label: 'Words', icon: Type },
  { value: 'Practice', label: 'Practice', icon: Activity },
  { value: 'Tasks', label: 'Tasks', icon: ClipboardCheck },
  { value: 'Test', label: 'Test', icon: FileText },
];

function SortableLesson({ id, title, type, onDelete, onEdit, onTypeChange }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 100 : 0, opacity: isDragging ? 0.5 : 1 };
  
  const TypeIcon = LESSON_TYPES.find(t => t.value === type)?.icon || PlayCircle;

  return (
    <div ref={setNodeRef} style={style} className="ml-8 mb-2">
      <div className="flex items-center gap-3 p-3 rounded-xl border glass bg-white/5 border-white/10 hover:border-primary/30 transition-all">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-primary">
          <GripVertical size={16} />
        </button>
        <TypeIcon size={16} className="text-muted-foreground" />
        <Input 
          defaultValue={title}
          onBlur={(e) => onEdit(e.target.value)}
          className="bg-transparent border-none focus-visible:ring-0 text-sm p-0 h-auto flex-1"
        />
        <Select value={type || 'Vocabulary'} onValueChange={onTypeChange}>
          <SelectTrigger className="w-[110px] h-8 text-xs glass border-white/10">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="glass font-['Outfit']">
            {LESSON_TYPES.map(t => (
              <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" onClick={onDelete} className="h-8 w-8 text-muted-foreground hover:text-destructive">
          <Trash2 size={14} />
        </Button>
      </div>
    </div>
  );
}

function SortableUnit({ id, title, children, onDelete, onEdit, onAddLesson }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 0, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="mb-6">
      <div className="flex items-center gap-3 p-4 rounded-xl border glass bg-primary/5 border-primary/20 shadow-sm mb-3">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-primary/60 hover:text-primary">
          <GripVertical size={20} />
        </button>
        <Layout size={18} className="text-primary" />
        <Input 
          defaultValue={title}
          onBlur={(e) => onEdit(e.target.value)}
          className="bg-transparent border-none focus-visible:ring-0 font-bold p-0 h-auto text-lg flex-1"
        />
        <Button variant="outline" size="sm" onClick={onAddLesson} className="h-8 rounded-lg gap-1 text-xs border-primary/20 hover:bg-primary/10">
          <Plus size={14} /> Lesson
        </Button>
        <Button variant="ghost" size="icon" onClick={onDelete} className="text-muted-foreground hover:text-destructive">
          <Trash2 size={18} />
        </Button>
      </div>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

function CourseContentManager() {
  const { courseId } = useParams({ from: '/_authenticated/admin/courses/$courseId/content' });
  const queryClient = useQueryClient();
  const updateStructureFn = useServerFn(updateCourseStructure);
  const [localUnits, setLocalUnits] = useState<any[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { data: course, isLoading } = useQuery({
    queryKey: ['admin-course-content', courseId],
    queryFn: async () => {
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*, units(*, lessons(*))')
        .eq('id', courseId)
        .single();
      
      if (courseError) throw courseError;
      return courseData;
    }
  });

  useEffect(() => {
    if (course?.units) {
      const sortedUnits = [...course.units].sort((a, b) => a.order_index - b.order_index).map(u => ({
        ...u,
        lessons: [...(u.lessons || [])].sort((a, b) => a.order_index - b.order_index)
      }));
      setLocalUnits(sortedUnits);
    }
  }, [course]);

  const handleSave = async () => {
    try {
      const payload = {
        courseId,
        units: localUnits.map((u, uIdx) => ({
          id: u.id?.startsWith('new-') ? undefined : u.id,
          title: u.title,
          order_index: uIdx,
          lessons: u.lessons.map((l: any, lIdx: number) => ({
            id: l.id?.startsWith('new-') ? undefined : l.id,
            title: l.title,
            order_index: lIdx,
            lesson_type: l.lesson_type
          }))
        }))
      };
      await updateStructureFn({ data: payload });
      toast.success("Changes saved successfully");
      queryClient.invalidateQueries({ queryKey: ['admin-course-content'] });
    } catch (error: any) {
      toast.error("Save failed: " + error.message);
    }
  };

  const addUnit = () => {
    const newUnit = {
      id: `new-unit-${Date.now()}`,
      title: 'New Unit',
      order_index: localUnits.length,
      lessons: []
    };
    setLocalUnits([...localUnits, newUnit]);
  };

  const addLesson = (unitId: string) => {
    setLocalUnits(localUnits.map(u => {
      if (u.id === unitId) {
        return {
          ...u,
          lessons: [...u.lessons, {
            id: `new-lesson-${Date.now()}`,
            title: 'Lesson جديد',
            order_index: u.lessons.length,
            lesson_type: 'Vocabulary'
          }]
        };
      }
      return u;
    }));
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    if (active.id !== over.id) {
      const activeUnitIdx = localUnits.findIndex(u => u.id === active.id);
      const overUnitIdx = localUnits.findIndex(u => u.id === over.id);

      if (activeUnitIdx !== -1 && overUnitIdx !== -1) {
        setLocalUnits(arrayMove(localUnits, activeUnitIdx, overUnitIdx));
        return;
      }

      // Lesson reordering within units (simplified)
      for (let i = 0; i < localUnits.length; i++) {
        const unit = localUnits[i];
        const activeLessonIdx = unit.lessons.findIndex((l: any) => l.id === active.id);
        const overLessonIdx = unit.lessons.findIndex((l: any) => l.id === over.id);
        
        if (activeLessonIdx !== -1 && overLessonIdx !== -1) {
          const newUnits = [...localUnits];
          newUnits[i].lessons = arrayMove(unit.lessons, activeLessonIdx, overLessonIdx);
          setLocalUnits(newUnits);
          break;
        }
      }
    }
  };

  if (isLoading) return <div className="p-8 text-center animate-pulse font-['Outfit']">Loading course content...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-['Outfit']" dir="ltr">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Course Content: {course?.title}</h1>
          <p className="text-muted-foreground text-sm">Organize and arrange units and lessons professionally.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addUnit} className="rounded-xl gap-2 border-primary/20">
            <Plus size={18} />
            Add Unit
          </Button>
          <Button onClick={handleSave} className="rounded-xl gap-2 shadow-lg shadow-primary/20">
            <Save size={18} />
            Save Changes
          </Button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={localUnits.map(u => u.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {localUnits.map((unit) => (
              <SortableUnit 
                key={unit.id} 
                id={unit.id} 
                title={unit.title} 
                onAddLesson={() => addLesson(unit.id)}
                onDelete={() => setLocalUnits(localUnits.filter(u => u.id !== unit.id))}
                onEdit={(val: string) => setLocalUnits(localUnits.map(u => u.id === unit.id ? {...u, title: val} : u))}
              >
                <SortableContext items={unit.lessons.map((l: any) => l.id)} strategy={verticalListSortingStrategy}>
                  {unit.lessons.map((lesson: any) => (
                    <SortableLesson 
                      key={lesson.id} 
                      id={lesson.id} 
                      title={lesson.title} 
                      type={lesson.lesson_type}
                      onTypeChange={(val: string) => setLocalUnits(localUnits.map(u => u.id === unit.id ? {
                        ...u, 
                        lessons: u.lessons.map((l: any) => l.id === lesson.id ? {...l, lesson_type: val} : l)
                      } : u))}
                      onDelete={() => setLocalUnits(localUnits.map(u => u.id === unit.id ? {
                        ...u, 
                        lessons: u.lessons.filter((l: any) => l.id !== lesson.id)
                      } : u))}
                      onEdit={(val: string) => setLocalUnits(localUnits.map(u => u.id === unit.id ? {
                        ...u, 
                        lessons: u.lessons.map((l: any) => l.id === lesson.id ? {...l, title: val} : l)
                      } : u))}
                    />
                  ))}
                </SortableContext>
              </SortableUnit>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {localUnits.length === 0 && (
        <Card className="glass border-dashed border-white/20 py-12">
          <CardContent className="flex flex-col items-center text-center">
            <div className="bg-primary/10 p-4 rounded-full mb-4">
              <FileText size={32} className="text-primary" />
            </div>
            <h3 className="text-lg font-bold">No units yet</h3>
            <p className="text-muted-foreground mb-6">Start by adding your first unit to organize your lessons.</p>
            <Button onClick={addUnit} className="rounded-xl gap-2">
              <Plus size={18} />
              Add Unit
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}